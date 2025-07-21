import MovieCard from "../components /MovieCard"
import {useState} from "react"

//contains entire user interface for home page
function Home () {
    //array of diff movies and renders them dynamically 

    //define piece of state that handles logic/state thats happening in our component
    const [searchQuery, setSearchQuery] = useState("");

    const movies = [
        {id: 1, title: "John Wick", release_date: "2020" },
        {id: 2, title: "Terminator", release_date: "1999" },
        {id: 3, title: "The Matrix", release_date: "1998" },
    ];

    const handleSearch = (e) => {
        e.preventDefault() // makes it so what u type in the search box doesnt disappear everytime u hit search 
        alert(searchQuery)
        setSearchQuery("")
    };
    //display movies in rows?

    //.map function iterate over all values inside movies array
    // and passes it to fucntion needs to return jsx code (component)
    // displays component for every single movie 
    // add .key to component we return, react needs to know what component to update
    return <div className="home">
        {/* This is the form to be able to search for movies */}
        <form onSubmit={handleSearch} className="search-form">
            <input type="text" 
            placeholder="Search for movies..." 
            className="search-input"
            value= {searchQuery}
            onChange = {(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-button"> Search</button>
        </form>
        <div className="movies-grid">
            {/* use .map to search */}
            {movies.map((movie) => (
                movie.title.toLowerCase().startsWith(searchQuery) && (
                    <MovieCard movie={movie} key={movie.id}/>
                )
            ))}
        </div>
    </div>
}

// to show this 
export default Home