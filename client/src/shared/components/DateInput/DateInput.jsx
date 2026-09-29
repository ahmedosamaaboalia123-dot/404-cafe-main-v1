import { Calendar } from "lucide-react";
import "./DateInput.css";

function DateInput({
    label,
    name,
    value,
    onChange,
    placeholder = "اختر التاريخ",
    required = false,
    disabled = false
}){
    return (
        <div className="date-field">
            {label && (
                <label>
                    {label}
                    {required && <span className="required"> *</span>}
                </label>
            )}
            <div className="date-wrapper">
                <Calendar className="date-icon" size={18} />
                <input
                    type="date"
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

export default DateInput;

