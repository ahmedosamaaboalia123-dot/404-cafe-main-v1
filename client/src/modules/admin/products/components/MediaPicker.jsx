import { useEffect, useState } from "react";
import { Image as ImageIcon, Upload, Check } from "lucide-react";
import { AsyncState, ServerPagination } from "@/shared/components";
import { toMediaContentSrc } from "../api/media.api";
import { toMediaAsset, useMediaDetails, useMediaList, useUploadMedia } from "../hooks/media.hooks";
import "./MediaPicker.css";

// Backend contract: GET /media/:id -> { asset, signed: { url, exp }, directUrl }
// Images hosted in the cloud arrive with their secure_url, so no lookup is needed.
function pickSigned(details) {
  if (!details || typeof details !== "object") return null;
  const direct = details.directUrl || details.asset?.url;
  if (direct) return direct;
  return toMediaContentSrc(details.signed);
}

// Backend contract: POST /media/uploads -> 201 { asset: { id, url, version, ... } }
function extractUploaded(data) {
  const asset = data?.asset || {};
  const id = asset.id;
  if (id === undefined || id === null || String(id).trim() === "") return null;
  return { id: String(id), url: asset.url || null, version: Number(asset.version ?? 0) };
}

export function ProductThumb({ imageId, url }) {
  const direct = url || null;
  const detailsQuery = useMediaDetails(!direct && imageId ? imageId : undefined);
  if (!direct && !imageId) {
    return (
      <span className="product-thumb product-thumb--empty" aria-label="بدون صورة">
        <ImageIcon size={18} />
      </span>
    );
  }
  if (direct) {
    return (
      <span className="product-thumb">
        <img src={direct} alt="صورة المنتج" loading="lazy" />
      </span>
    );
  }
  if (detailsQuery.isLoading) {
    return (
      <span className="product-thumb product-thumb--loading" aria-label="جاري تحميل الصورة">
        <ImageIcon size={18} />
      </span>
    );
  }
  const src = pickSigned(detailsQuery.data);
  if (!src) {
    return (
      <span className="product-thumb product-thumb--empty" aria-label="تعذر عرض الصورة">
        <ImageIcon size={18} />
      </span>
    );
  }
  return (
    <span className="product-thumb">
      <img src={src} alt="صورة المنتج" loading="lazy" />
    </span>
  );
}

function ExistingPreview({ mediaId, url }) {
  const detailsQuery = useMediaDetails(!url && mediaId ? mediaId : undefined);
  if (!mediaId) return <p className="media-picker__hint">اختر صورة من القائمة لعرض المعاينة.</p>;
  if (url)
    return (
      <div className="media-picker__preview">
        <img src={url} alt="معاينة الصورة المختارة" />
      </div>
    );
  if (detailsQuery.isLoading) return <p className="media-picker__hint">جاري تحميل المعاينة...</p>;
  if (detailsQuery.isError) return <p className="media-picker__error" role="alert">تعذر تحميل المعاينة.</p>;
  const src = pickSigned(detailsQuery.data);
  if (!src) return <p className="media-picker__hint">لا توجد معاينة متاحة لهذه الصورة.</p>;
  return (
    <div className="media-picker__preview">
      <img src={src} alt="معاينة الصورة المختارة" />
    </div>
  );
}

export default function MediaPicker({ value, onChange, imageUrl = null }) {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [localUrl, setLocalUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(value ? String(value) : "");

  const listQuery = useMediaList(tab === "existing" ? { status: "READY", page, limit: 10 } : { status: "READY", page: 1, limit: 10 });
  const upload = useUploadMedia();

  useEffect(() => {
    setSelectedId(value ? String(value) : "");
  }, [value]);

  useEffect(() => {
    if (!file) {
      setLocalUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (event) => {
    upload.resetAttempt();
    setFileError("");
    const next = event.target.files?.[0];
    if (!next) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(next.type)) {
      setFileError("الصيغة غير مدعومة — استخدم jpeg أو png أو webp");
      return;
    }
    if (next.size > 2 * 1024 * 1024) {
      setFileError("حجم الصورة أكبر من 2MB");
      return;
    }
    setFile(next);
  };

  const submitUpload = () => {
    if (!file) {
      setFileError("اختر صورة أولًا");
      return;
    }
    setFileError("");
    upload.mutate(file, {
      onSuccess: (data) => {
        const uploaded = extractUploaded(data);
        if (!uploaded) {
          setFileError("تم الرفع لكن تعذر قراءة معرف الصورة");
          return;
        }
        setFile(null);
        // `fresh` lets the parent drop the remote copy if the product save fails.
        onChange?.(uploaded.id, { fresh: true, url: uploaded.url, version: uploaded.version });
      },
    });
  };

  const assets = (listQuery.data?.items || []).map(toMediaAsset);
  const currentValue = value ? String(value) : "";
  const selectedAsset = assets.find((item) => String(item.id) === selectedId) || null;

  return (
    <div className="media-picker">
      {currentValue ? (
        <div className="media-picker__current">
          <ProductThumb imageId={currentValue} url={imageUrl} />
          <div>
            <strong>صورة مختارة</strong>
            <small>معرف: {currentValue}</small>
          </div>
          <button type="button" className="media-picker__clear" onClick={() => onChange?.(null, { fresh: false, url: null })}>
            إزالة الصورة
          </button>
        </div>
      ) : (
        <p className="media-picker__hint">لا توجد صورة مختارة — ارفع جديدة أو اختر من الجاهزة.</p>
      )}

      <div className="media-picker__tabs" role="tablist" aria-label="مصدر الصورة">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upload"}
          className={tab === "upload" ? "active" : ""}
          onClick={() => setTab("upload")}
        >
          رفع جديدة
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "existing"}
          className={tab === "existing" ? "active" : ""}
          onClick={() => setTab("existing")}
        >
          من الصور الجاهزة
        </button>
      </div>

      {tab === "upload" ? (
        <div className="media-picker__pane">
          <label className="media-picker__file">
            <Upload size={16} />
            <span>اختيار صورة (jpeg/png/webp حتى 2MB)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} />
          </label>
          {localUrl && (
            <div className="media-picker__preview">
              <img src={localUrl} alt="معاينة محلية" />
            </div>
          )}
          {(fileError || upload.isError) && (
            <p className="media-picker__error" role="alert">
              {fileError || upload.error?.message || "تعذر رفع الصورة"}
            </p>
          )}
          <button type="button" className="media-picker__primary" disabled={!file || upload.isPending} onClick={submitUpload}>
            {upload.isPending ? "جاري الرفع..." : "رفع واختيار"}
          </button>
        </div>
      ) : (
        <div className="media-picker__pane">
          <AsyncState
            loading={listQuery.isLoading}
            error={listQuery.error}
            onRetry={listQuery.refetch}
            empty={!listQuery.isLoading && assets.length === 0}
            emptyText="لا توجد صور جاهزة"
          >
            <div className="media-picker__grid">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className={selectedId === String(asset.id) ? "selected" : ""}
                  onClick={() => {
                    setSelectedId(String(asset.id));
                  }}
                  aria-pressed={selectedId === String(asset.id)}
                >
                  <ProductThumb imageId={String(asset.id)} url={asset.url} />
                  <small>#{asset.assetNo || String(asset.id).slice(-6)}</small>
                  <span>{asset.statusLabel || "جاهزة"}</span>
                </button>
              ))}
            </div>
          </AsyncState>
          <ServerPagination meta={listQuery.data?.pageMeta} onPageChange={setPage} disabled={listQuery.isFetching} label="صورة" />
          <ExistingPreview mediaId={selectedId} url={selectedAsset?.url} />
          <button
            type="button"
            className="media-picker__primary"
            disabled={!selectedId}
            onClick={() =>
              selectedId &&
              onChange?.(String(selectedId), { fresh: false, url: selectedAsset?.url ?? null })
            }
          >
            <Check size={15} />
            تأكيد الاختيار
          </button>
        </div>
      )}
    </div>
  );
}
