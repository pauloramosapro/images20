const MyButtons = ({ text }) => {
    return (
        <button className="
        rounded-md 
        bg-blue-500 
        border-2 
        border-sky-500 
        px-2
        hover:bg-sky-500
        w-[300px]
        ">
            {text}
        </button>
    );
}

export default MyButtons;