import React, { useState, useEffect } from 'react';


// create a component 
const Form = ({placeHolder, isSearching}) => {
    return(
        <form>
            <div className="search-input">
                <input type="text" placeholder={placeHolder} onChange={isSearching}/>
                <button type="button"> 
                    <i class="fa-solid fa-magnifying-glass"></i> 
                </button> 
            </div>
        </form>
    );
}

export default Form;
