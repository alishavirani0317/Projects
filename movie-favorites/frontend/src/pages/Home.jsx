import MovieCard from "../components /MovieCard"
import {useState, useEffect} from "react"
import { searchMovies, getPopularMovies } from "../services/api";
import "../css/Home.css"

//contains entire user interface for home page
function Home () {
    //array of diff movies and renders them dynamically 

    //define piece of state that handles logic/state thats happening in our component
    // when a state change occurs, the entire component is reran or re render
    const [searchQuery, setSearchQuery] = useState("");
    // useEffect lets u add side effects to functions/components & define when they should run 
    const [movies, setMovies] = useState([]);
    const [error, setError]  = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=> {
        const loadPopularMovies = async() => {
            try {
                const popularMovies = await getPopularMovies()
                setMovies(popularMovies)
            } catch(err){
                console.log(err)
                setError("Failed to load movies .. ")
            }
            finally {
                setLoading(false)
            }
        }
        loadPopularMovies()
    }, [])
 
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
            {error && <div className="error-message">{error}</div>}
        {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="movies-grid">
        {/* use .map to search */}
          {movies.map((movie) => (
            <MovieCard movie={movie} key={movie.id} />
          ))}
        </div>
      )}
    </div>
}

// to show this 
export default Home