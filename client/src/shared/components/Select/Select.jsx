import { ChevronDown } from "lucide-react";
import "./Select.css";

function Select({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = "اختر",
    required = false,
    disabled = false
}){
    return (
        <div className="select-field">
            {label && (
                <label>
                    {label}
                    {required && <span className="required"> *</span>}
                </label>
            )}
            <div className="select-wrapper">
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                >
                    <option value="">{placeholder}</option>
                    {options.map(item => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="select-arrow" size={18} />
            </div>
        </div>
    );
}

export default Select;

