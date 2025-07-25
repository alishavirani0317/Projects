import './css/App.css';
//import MovieCard from './components /MovieCard';
import Favorites from "./pages/Favorites";
import Home from "./pages/Home";
import {Routes, Route} from "react-router-dom";
import { MovieProvider } from './contexts/MovieContext';
import NavBar from './components /NavBar';
//where react stuff goes 

//component start with capital letter
function App() {
  //return just one root element per level
  // fragment -> empty tag <>
  return ( 
    <MovieProvider>
      <NavBar />
    <main className="main-content">
      <Routes>
         <Route path="/" element={<Home />}/>
         <Route path="/favorites" element={<Favorites />}/>
      </Routes>
    </main>
    </MovieProvider>
  );
}
// add prop : set of curly braces

export default App;
