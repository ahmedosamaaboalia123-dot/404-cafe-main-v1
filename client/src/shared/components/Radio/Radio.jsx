import "./Radio.css";


function Radio({

label,

name,

value,

checked,

onChange

}){


return (

<label className="radio">


<input


type="radio"


name={name}


value={value}


checked={checked}


onChange={onChange}


/>


<span>

{label}

</span>


</label>


)


}


export default Radio;
