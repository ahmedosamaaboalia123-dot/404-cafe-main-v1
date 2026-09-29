import "./Button.css";

function Button({
    children,
    type = "button",
    variant = "primary",
    onClick,
    disabled = false,
    loading = false,
    icon: Icon
}){
    return (
        <button
            type={type}
            className={`button button--${variant}`}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {Icon && <Icon size={18} className="button-icon" />}
            {loading ? "جاري التنفيذ..." : children}
        </button>
    );
}

export default Button;

