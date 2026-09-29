import {
Menu
} from "lucide-react";



function MenuButton({ onClick, isOpen }){


return (

<button
    type="button"
    className="menu-button"
    onClick={onClick}
    aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
    aria-expanded={isOpen}
>


<Menu/>


</button>

)


}


export default MenuButton;
