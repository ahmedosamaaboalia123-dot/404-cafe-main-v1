import React from "react";
import { X, Bell, CheckCircle2, Clock } from "lucide-react";

export default function NotificationsModal({ isOpen, onClose, notifications = [] }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-header">
          <div className="game-title-row">
            <Bell size={22} className="game-sparkle-icon" />
            <h3 className="game-main-title">الإشعارات والتنبيهات</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="game-modal-body">
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notification-item-card ${notif.unread ? "unread-notif" : ""}`}
              >
                <div className="notif-header-row">
                  <h4 className="notif-title">{notif.title}</h4>
                  <span className="notif-time">
                    <Clock size={12} /> {notif.time}
                  </span>
                </div>
                <p className="notif-desc">{notif.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
