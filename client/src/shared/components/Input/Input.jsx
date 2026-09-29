import "./Input.css";
import { forwardRef } from "react";

const Input = forwardRef(function Input({
    label,
    name,
    type = "text",
    placeholder = "",
    value,
    onChange,
    required = false,
    disabled = false,
    min,
    max,
    error,
    ...inputProps
}, ref){
    return (
        <div className="input-field">
            {label && (
                <label>
                    {label}
                    {required && <span className="required"> *</span>}
                </label>
            )}
            <div className="input-wrapper">
                <input
                    ref={ref}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    min={min}
                    max={max}
                    required={required}
                    {...inputProps}
                />
            </div>
            {error && <span className="input-error" role="alert">{error}</span>}
        </div>
    );
});

export default Input;
