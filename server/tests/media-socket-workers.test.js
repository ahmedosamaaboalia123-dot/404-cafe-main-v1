import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import {
  assertReadyAsset,
  deleteAsset,
  processMediaCleanup,
  releaseUnusedAsset,
  signAssetUrl,
  uploadAsset,
  verifyAssetUrl
} from '../src/modules/media/media.service.js';
import { createProduct, updateProduct } from '../src/modules/products/product.service.js';
import { attachSocketTransport } from '../src/modules/realtime/socket-transport.js';
import { publishRealtimeEvent } from '../src/modules/realtime/realtime.publisher.js';
import { startWorkers } from '../src/jobs/worker-runner.js';
import { tickOutbox } from '../src/jobs/outbox.job.js';
import { tickShiftWarnings } from '../src/jobs/shift-warnings.job.js';
import { tickReportExports } from '../src/jobs/exports.job.js';

const id = () => new mongoose.Types.ObjectId();
const jpeg = (size = 64) => {
  const buffer = Buffer.alloc(size, 0);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  return buffer;
};
// Mirrors the real `cloudinary.v2` client: `upload_stream(options, callback)`
// returns a writable, and `destroy(publicId, options, callback)` is node-style.
const fakeCloudinary = (overrides = {}) => {
  const uploader = {
    upload_stream: vi.fn((options, callback) => {
      const stream = {
        on: vi.fn(),
        end: (buffer) => {
          callback(null, {
            public_id: `${options.folder}/${options.public_id}`,
            secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${options.folder}/${options.public_id}.jpg`,
            format: 'jpg',
            width: 1200,
            height: 900,
            bytes: buffer.length
          });
        }
      };
      return stream;
    }),
    destroy: vi.fn((publicId, options, callback) => {
      callback(null, { result: 'ok' });
    }),
    ...overrides
  };
  return { uploader };
};
const mediaContext = (overrides = {}) => ({
  actorId: id(),
  actorType: 'EMPLOYEE',
  sequenceModel: { findOneAndUpdate: async () => ({ value: 2 }) },
  auditModel: { create: async ([v]) => [v] },
  outboxModel: { create: async ([v]) => [v] },
  mediaConfig: {
    storageDir: join(tmpdir(), 'media-batch26-tests'),
    urlSecret: 'test-media-url-secret-at-least-32-chars',
    maxBytes: 2 * 1024 * 1024
  },
  cloudinaryConfig: {
    cloudName: 'demo',
    apiKey: 'key',
    apiSecret: 'secret',
    folder: 'products'
  },
  ...overrides
});
// The upload flip runs its own transaction; stub the session starter so tests
// never touch a real connection.
const localSessionOptions = () => ({
  startSession: async () => ({
    withTransaction: async (fn) => {
      await fn();
    },
    endSession: async () => {}
  })
});

describe('media assets', () => {
  it('rejects empty oversized and fake images', async () => {
    const models = { MediaAsset: { create: vi.fn() } };
    const cloud = fakeCloudinary();
    const context = { ...mediaContext(), mediaModels: models, cloudinaryPort: cloud };
    await expect(uploadAsset({ buffer: Buffer.alloc(0) }, {}, context)).rejects.toMatchObject({
      code: 'MEDIA_EMPTY_FILE'
    });
    await expect(uploadAsset({ buffer: jpeg(3 * 1024 * 1024) }, {}, context)).rejects.toMatchObject({
      code: 'MEDIA_TOO_LARGE'
    });
    await expect(
      uploadAsset({ buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]) }, {}, context)
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_REJECTED' });
    expect(models.MediaAsset.create).not.toHaveBeenCalled();
    expect(cloud.uploader.upload_stream).not.toHaveBeenCalled();
  });
  it('uploads to cloudinary through a staging row flipped to ready', async () => {
    let staged;
    const cloud = fakeCloudinary();
    const asset = await uploadAsset(
      { buffer: jpeg(), originalname: 'cup.jpg' },
      {},
      {
        ...mediaContext(),
        transactionOptions: localSessionOptions(),
        cloudinaryPort: cloud,
        mediaModels: {
          MediaAsset: {
            create: async ([v]) => {
              staged = { _id: id(), ...v };
              return [staged];
            },
            findOneAndUpdate: async (filter, update) => ({ ...staged, ...update.$set, status: 'READY' })
          }
        }
      }
    );
    expect(cloud.uploader.upload_stream).toHaveBeenCalledTimes(1);
    expect(cloud.uploader.upload_stream.mock.calls[0][0]).toMatchObject({
      folder: 'products',
      public_id: 'MED-00000002',
      resource_type: 'image'
    });
    expect(asset.mimeType).toBe('image/jpeg');
    // The staging row exists before the provider call, with a deterministic ID.
    expect(staged).toMatchObject({
      status: 'UPLOADING',
      provider: 'CLOUDINARY',
      publicId: 'products/MED-00000002',
      cleanupStatus: 'PENDING'
    });
    expect(staged.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(asset.status).toBe('READY');
    expect(asset.secureUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/products/MED-00000002.jpg'
    );
    expect(asset.width).toBe(1200);
    expect(asset.storageKey).toBe('MED-00000002.jpg');
  });
  it('fails the upload but keeps a staged row for deferred cleanup', async () => {
    const created = [];
    const updated = [];
    const cloud = fakeCloudinary({
      upload_stream: vi.fn((options, callback) => {
        const stream = {
          on: vi.fn(),
          end: () => {
            callback(new Error('cloudinary 500'));
          }
        };
        return stream;
      })
    });
    const models = {
      MediaAsset: {
        create: async ([v]) => {
          const row = { _id: id(), ...v };
          created.push(row);
          return [row];
        },
        updateOne: async (filter, update) => {
          updated.push({ filter, update });
          return {};
        },
        findOneAndUpdate: async () => null
      }
    };
    await expect(
      uploadAsset(
        { buffer: jpeg() },
        {},
        {
          ...mediaContext(),
          transactionOptions: localSessionOptions(),
          mediaModels: models,
          cloudinaryPort: cloud
        }
      )
    ).rejects.toMatchObject({ code: 'MEDIA_UPLOAD_FAILED', status: 502 });
    // Staging exists (for the cleanup worker), the row is marked deleted, and
    // nothing reached the provider, so there is nothing to destroy.
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ status: 'UPLOADING', cleanupStatus: 'PENDING' });
    expect(updated.length).toBeGreaterThan(0);
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
  });
  it('fails fast when the staging row cannot be saved', async () => {
    const cloud = fakeCloudinary();
    await expect(
      uploadAsset(
        { buffer: jpeg() },
        {},
        {
          ...mediaContext(),
          transactionOptions: localSessionOptions(),
          cloudinaryPort: cloud,
          mediaModels: {
            MediaAsset: {
              create: async () => {
                throw new Error('mongo down');
              }
            }
          }
        }
      )
    ).rejects.toThrow('mongo down');
    // Nothing reached the provider, so there is nothing to destroy.
    expect(cloud.uploader.upload_stream).not.toHaveBeenCalled();
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
  });
  it('refuses to upload when cloudinary credentials are missing', async () => {
    const cloud = fakeCloudinary();
    await expect(
      uploadAsset(
        { buffer: jpeg() },
        {},
        {
          ...mediaContext({ cloudinaryConfig: { cloudName: '', apiKey: '', apiSecret: '' } }),
          cloudinaryPort: undefined,
          mediaModels: { MediaAsset: { create: vi.fn() } },
          cloudinaryConfig: { cloudName: '', apiKey: '', apiSecret: '' }
        }
      )
    ).rejects.toMatchObject({ code: 'MEDIA_CLOUD_NOT_CONFIGURED' });
    expect(cloud.uploader.upload_stream).not.toHaveBeenCalled();
  });
  it('signs expiring urls and rejects tampered ones', () => {
    const context = mediaContext();
    const assetId = String(id());
    const { url, exp } = signAssetUrl(assetId, context);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(verifyAssetUrl(assetId, params.get('sig'), Number(params.get('exp')), context)).toBe(
      true
    );
    expect(verifyAssetUrl(assetId, params.get('sig'), 1, context)).toBe(false);
    expect(verifyAssetUrl(assetId, 'deadbeef', exp, context)).toBe(false);
    expect(exp).toBeGreaterThan(Date.now() / 1000);
  });
  it('gates product images on ready assets only', async () => {
    const ready = { _id: id(), status: 'READY' };
    await expect(
      assertReadyAsset('507f1f77bcf86cd799439011', {
        mediaModels: { MediaAsset: { findOneAndUpdate: () => ({ lean: async () => null }) } }
      })
    ).rejects.toMatchObject({ code: 'ASSET_NOT_READY' });
    await expect(
      assertReadyAsset(String(ready._id), {
        mediaModels: {
          // The real filter ({ _id, status: 'READY' }) matches nothing for a
          // quarantined asset, so the claim returns null.
          MediaAsset: {
            findOneAndUpdate: () => ({ lean: async () => null })
          }
        }
      })
    ).rejects.toMatchObject({ code: 'ASSET_NOT_READY' });
    const claim = vi.fn(() => ({ lean: async () => ready }));
    await expect(
      assertReadyAsset(String(ready._id), {
        mediaModels: { MediaAsset: { findOneAndUpdate: claim } }
      })
    ).resolves.toMatchObject({ status: 'READY' });
    // The claim is a real write so attachment races with deletion.
    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'READY' }),
      expect.objectContaining({ $inc: { referenceVersion: 1 } }),
      expect.anything()
    );
  });
  it('refuses deleting images attached to products', async () => {
    const cloud = fakeCloudinary();
    const asset = {
      _id: id(),
      version: 0,
      status: 'READY',
      provider: 'CLOUDINARY',
      publicId: 'products/MED-00000007',
      storageKey: 'MED-1.jpg',
      save: vi.fn()
    };
    await expect(
      deleteAsset(
        asset._id,
        { expectedVersion: 0 },
        {
          ...mediaContext(),
          session: {},
          cloudinaryPort: cloud,
          mediaModels: { MediaAsset: { findOne: () => ({ session: async () => asset }) } },
          mediaProductsPort: { isReferenced: async () => true }
        }
      )
    ).rejects.toMatchObject({ code: 'ASSET_IN_USE' });
    expect(asset.status).toBe('READY');
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
  });
  it('marks deletion in-transaction and destroys the file in deferred cleanup', async () => {
    const cloud = fakeCloudinary();
    const asset = {
      _id: id(),
      version: 0,
      status: 'READY',
      provider: 'CLOUDINARY',
      publicId: 'products/MED-00000007',
      storageKey: 'MED-1.jpg',
      save: vi.fn(async () => {})
    };
    const done = await deleteAsset(
      asset._id,
      { expectedVersion: 0 },
      {
        ...mediaContext(),
        session: {},
        cloudinaryPort: cloud,
        mediaModels: { MediaAsset: { findOne: () => ({ session: async () => asset }) } },
        mediaProductsPort: { isReferenced: async () => false }
      }
    );
    expect(done.status).toBe('DELETED');
    // The provider call is deferred, never inside the transaction.
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
    const updated = [];
    const result = await processMediaCleanup({
      ...mediaContext(),
      assetId: asset._id,
      cloudinaryPort: cloud,
      mediaModels: {
        MediaAsset: {
          findOneAndUpdate: async () => ({ ...asset, status: 'DELETED', cleanupStatus: 'PENDING', cleanupAttempts: 0 }),
          updateOne: async (filter, update) => {
            updated.push(update);
            return {};
          }
        }
      }
    });
    expect(cloud.uploader.destroy).toHaveBeenCalledWith(
      'products/MED-00000007',
      expect.objectContaining({ resource_type: 'image', invalidate: true }),
      expect.any(Function)
    );
    expect(result).toMatchObject({ processed: 1, failed: 0 });
    expect(updated.length).toBeGreaterThan(0);
  });
  it('never destroys a cloudinary image without a confirmed public id', async () => {
    const cloud = fakeCloudinary();
    const asset = {
      _id: id(),
      version: 0,
      status: 'READY',
      provider: 'CLOUDINARY',
      publicId: null,
      storageKey: 'MED-9.jpg',
      save: vi.fn(async () => {})
    };
    await deleteAsset(
      asset._id,
      { expectedVersion: 0 },
      {
        ...mediaContext(),
        session: {},
        cloudinaryPort: cloud,
        mediaModels: { MediaAsset: { findOne: () => ({ session: async () => asset }) } },
        mediaProductsPort: { isReferenced: async () => false }
      }
    );
    expect(asset.status).toBe('DELETED');
    const result = await processMediaCleanup({
      ...mediaContext(),
      assetId: asset._id,
      cloudinaryPort: cloud,
      mediaModels: {
        MediaAsset: {
          findOneAndUpdate: async () => ({ ...asset, cleanupAttempts: 0 }),
          updateOne: async () => ({})
        }
      }
    });
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ processed: 1, failed: 0 });
  });
  it('releases a replaced image only when nothing references it', async () => {
    const cloud = fakeCloudinary();
    const asset = {
      _id: id(),
      status: 'READY',
      provider: 'CLOUDINARY',
      publicId: 'products/MED-00000005',
      storageKey: 'MED-5.jpg',
      save: vi.fn(async () => {})
    };
    const models = {
      MediaAsset: { findOne: () => ({ session: async () => asset }) }
    };
    const kept = await releaseUnusedAsset(
      asset._id,
      {
        ...mediaContext(),
        session: {},
        cloudinaryPort: cloud,
        mediaModels: models,
        mediaProductsPort: { isReferenced: async () => true }
      }
    );
    expect(kept).toBeNull();
    expect(asset.status).toBe('READY');
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
    const released = await releaseUnusedAsset(
      asset._id,
      {
        ...mediaContext(),
        session: {},
        cloudinaryPort: cloud,
        mediaModels: models,
        mediaProductsPort: { isReferenced: async () => false }
      }
    );
    expect(released.status).toBe('DELETED');
    expect(released.deleteReason).toBe('image-replaced');
    // Destruction happens in the deferred cleanup, not in the release call.
    expect(cloud.uploader.destroy).not.toHaveBeenCalled();
    const result = await processMediaCleanup({
      ...mediaContext(),
      assetId: asset._id,
      cloudinaryPort: cloud,
      mediaModels: {
        MediaAsset: {
          findOneAndUpdate: async () => ({ ...released, cleanupAttempts: 0 }),
          updateOne: async () => ({})
        }
      }
    });
    expect(cloud.uploader.destroy).toHaveBeenCalledWith(
      'products/MED-00000005',
      expect.objectContaining({ resource_type: 'image', invalidate: true }),
      expect.any(Function)
    );
    expect(result).toMatchObject({ processed: 1, failed: 0 });
  });
  it('checks product images through the media port when present', async () => {
    const assertReady = vi.fn(async () => ({ secureUrl: 'https://res.cloudinary.com/demo/a.jpg' }));
    const models = {
      ProductCategory: {
        findOne: () => ({ session: async () => ({ _id: id(), status: 'ACTIVE' }) })
      },
      Product: { create: async ([v]) => [{ _id: id(), ...v }] }
    };
    const created = await createProduct(
      { name: 'لاتيه', categoryId: String(id()), imageId: String(id()) },
      { session: {}, productModels: models, mediaPort: { assertReady } }
    );
    expect(assertReady).toHaveBeenCalledTimes(1);
    expect(created.imageUrl).toBe('https://res.cloudinary.com/demo/a.jpg');
  });
  it('stores the new url and releases the replaced image', async () => {
    const releaseUnused = vi.fn(async () => null);
    const product = {
      _id: id(),
      name: 'موكا',
      imageId: id(),
      imageUrl: 'https://res.cloudinary.com/demo/old.jpg',
      catalogVersion: 1,
      version: 2,
      save: vi.fn()
    };
    const models = {
      Product: {
        findOne: () => ({ session: async () => product })
      }
    };
    const nextImageId = String(id());
    const previousImageId = String(product.imageId);
    const updated = await updateProduct(
      product._id,
      { imageId: nextImageId, expectedVersion: 2 },
      {
        session: {},
        productModels: models,
        mediaPort: {
          assertReady: async () => ({ secureUrl: 'https://res.cloudinary.com/demo/new.jpg' }),
          releaseUnused
        }
      }
    );
    expect(updated.imageUrl).toBe('https://res.cloudinary.com/demo/new.jpg');
    expect(String(updated.imageId)).toBe(nextImageId);
    expect(releaseUnused).toHaveBeenCalledWith(previousImageId, expect.anything());
  });
  it('clears the stored url when the image is removed', async () => {
    const releaseUnused = vi.fn(async () => null);
    const product = {
      _id: id(),
      name: 'كابتشينو',
      imageId: id(),
      imageUrl: 'https://res.cloudinary.com/demo/old.jpg',
      catalogVersion: 1,
      version: 0,
      save: vi.fn()
    };
    const models = { Product: { findOne: () => ({ session: async () => product }) } };
    const updated = await updateProduct(
      product._id,
      { imageId: null, expectedVersion: 0 },
      { session: {}, productModels: models, mediaPort: { releaseUnused } }
    );
    expect(updated.imageId).toBeNull();
    expect(updated.imageUrl).toBeNull();
    expect(releaseUnused).toHaveBeenCalledTimes(1);
  });
});

describe('socket transport', () => {
  const fakeIo = () => {
    const handlers = {};
    const emitted = [];
    const io = {
      handlers,
      emitted,
      use: vi.fn((fn) => {
        io.middleware = fn;
      }),
      on: vi.fn((event, fn) => {
        handlers[event] = fn;
      }),
      to: vi.fn((room) => ({
        emit: (event, envelope) => emitted.push({ room, event, envelope })
      })),
      close: vi.fn(async () => {})
    };
    return io;
  };
  it('rejects sockets without employee tokens', async () => {
    const io = fakeIo();
    attachSocketTransport({}, {}, () => io);
    const error = await new Promise((resolve) => {
      io.middleware({ handshake: { auth: {} }, data: {} }, (err) => resolve(err));
    });
    expect(String(error?.message ?? error)).toContain('unauthorized');
  });
  it('subscribes sockets only to allowed rooms and fans events out', async () => {
    const { clearRealtimeSubscribers } =
      await import('../src/modules/realtime/realtime.publisher.js');
    clearRealtimeSubscribers();
    const io = fakeIo();
    attachSocketTransport({}, {}, () => io);
    const joined = [];
    const socket = {
      handshake: { auth: { token: 'x' } },
      data: { auth: { actorId: 'emp1', permissions: ['orders.read'] } },
      join: (room) => joined.push(room),
      on: vi.fn()
    };
    const connect = io.handlers.connection;
    connect(socket);
    const subscribe = socket.on.mock.calls.find((call) => call[0] === 'subscribe')[1];
    let acked;
    subscribe(['order:abc', 'admin:orders', 'admin:preparation'], (response) => {
      acked = response;
    });
    expect(joined).toContain('order:abc');
    expect(joined).toContain('admin:orders');
    expect(joined).not.toContain('admin:preparation');
    expect(acked.rooms).toHaveLength(2);
    await publishRealtimeEvent({
      _id: id(),
      aggregateType: 'Order',
      aggregateId: 'abc',
      eventType: 'order.updated',
      sequence: 3,
      createdAt: new Date(),
      payloadSafe: { orderId: 'abc' }
    });
    expect(io.emitted.length).toBeGreaterThan(0);
    expect(io.emitted.every((entry) => entry.event === 'event')).toBe(true);
    clearRealtimeSubscribers();
  });
});

describe('background workers', () => {
  it('publishes claimed outbox events and buries the exhausted', async () => {
    const event = { _id: id(), attempts: 11, toObject: () => ({ _id: 'e' }) };
    const bury = vi.fn(async () => ({}));
    const result = await tickOutbox({
      outboxJobsPort: {
        claim: async () => [event],
        publish: async () => {
          throw new Error('bus down');
        },
        fanout: vi.fn(),
        mark: vi.fn(),
        bury
      }
    });
    expect(result).toMatchObject({ claimed: 1, dead: 1 });
    expect(bury).toHaveBeenCalledTimes(1);
  });
  it('retries failed publishes instead of dropping them', async () => {
    const event = { _id: id(), attempts: 2 };
    const retry = vi.fn(async () => ({}));
    const result = await tickOutbox({
      outboxJobsPort: {
        claim: async () => [event],
        publish: async () => {
          throw new Error('bus down');
        },
        fanout: vi.fn(),
        mark: vi.fn(),
        retry,
        bury: vi.fn()
      }
    });
    expect(result).toMatchObject({ claimed: 1, retried: 1 });
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('notifies shift owners once per threshold', async () => {
    const alert = {
      _id: id(),
      shiftId: id(),
      shiftNoSnapshot: 'SH-1',
      thresholdHours: 12,
      openedBy: id()
    };
    const notify = vi.fn(async () => ({ created: 1, skipped: 0 }));
    const result = await tickShiftWarnings({
      shiftWarningJobsPort: {
        emit: async () => [alert],
        notify
      }
    });
    expect(result).toMatchObject({ alerts: 1, notified: 1 });
    expect(notify.mock.calls[0][1]).toMatchObject({ type: 'SHIFT_OPEN_TOO_LONG' });
    expect(notify.mock.calls[0][1].deduplicationKey).toContain('12');
  });
  it('processes queued exports and marks failures', async () => {
    const job = { _id: id() };
    const process = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'));
    const updated = [];
    const context = {
      exportsJobsModels: {
        ReportExport: {
          find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [job, job] }) }) }),
          findByIdAndUpdate: async (query, update) => {
            updated.push(update.$set.status);
            return {};
          }
        }
      },
      exportsJobsPort: { process }
    };
    const result = await tickReportExports(context);
    expect(result).toMatchObject({ queued: 2, processed: 1, failed: 1 });
    expect(updated).toContain('FAILED');
  });
  it('runs worker ticks on a schedule until stopped', async () => {
    let calls = 0;
    const workers = startWorkers(
      [{ name: 'fast', intervalMs: 5, run: async () => ({ calls: (calls += 1) }) }],
      { logger: { error: () => {} } }
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    workers.stop();
    const frozen = calls;
    expect(frozen).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toBe(frozen);
  });
});
