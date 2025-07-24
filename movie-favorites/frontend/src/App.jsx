import './App.css';
//import MovieCard from './components /MovieCard';
import Favorites from "./pages/Favorites";
import Home from "./pages/Home"
import {Routes, Route} from "react-router-dom"
import NavBar from './components /NavBar';
//where react stuff goes 

//component start with capital letter
function App() {
  //return just one root element per level
  // fragment -> empty tag <>
  return ( 
    <div>
      <NavBar />
    <main className="main-content">
      <Routes>
         <Route path="/" element={<Home />}/>
         <Route path="/favorites" element={<Favorites />}/>
      </Routes>
    </main>
    </div>
  );
}
// add prop : set of curly braces

export default App;
