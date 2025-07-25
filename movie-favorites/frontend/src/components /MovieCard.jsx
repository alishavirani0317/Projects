//movie card component
import "../css/MovieCard.css"
import { useMovieContext } from "../contexts/MovieContext"

function MovieCard({movie}){
    //func triggered when we click button
    const {isFavorite, addToFavorites, removeFromFavorites} = useMovieContext()
    const favorite = isFavorite(movie.id) // if we r currently favorited or not

    function onFavoriteClick(e){
        e.preventDefault()
        // if we r currently favorited -> unfavorite it 
        if (favorite) removeFromFavorites(movie.id)
        // but if we r not currently favorited -> favorite it 
        else addToFavorites(movie)
    }

    return <div className="movie-card">
        <div className="movie-poster">
            <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title}/>
            <div className="movie-overlay">
                <button className={`favorite-btn ${favorite ? "active" : ""}`} onClick={onFavoriteClick}>
                    ♥
                </button>
            </div>
        </div>
        <div className="movie-info">
            <h3>{movie.title}</h3>
            <p>{movie.release_date?.split("-")[0]}</p>
        </div>
    </div>
}

export default MovieCard