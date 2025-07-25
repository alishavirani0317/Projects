
# Movie Favorites App

A simple and interactive React web app that lets users explore popular movies and favorite the ones they like. Favorites are stored using local storage so they persist across sessions. Built to showcase React best practices, context API usage, and clean UI design.

## Features

- **Browse Popular Movies**: Automatically fetches and displays trending movies using TMDB API.
- **Search Functionality**: Look up specific movies with a search bar.
- **Favorite/Unfavorite Movies**: Easily mark movies as favorites by clicking the heart icon.
- **Favorites Page**: View all your favorited movies on a dedicated page.
- **Persistent Favorites**: Uses `localStorage` so favorites remain saved even after a page refresh.
- **Responsive UI**: Clean and mobile-friendly design.

## What I Used
- **React**
- **React Router**
- **Context API** – for global state management of favorite movies.
- **Local Storage** – for saving user favorites across sessions.
- **CSS** – custom styling with separate CSS files per component.
- **TMDB API** – used for fetching popular movies and search results.

## Why I Built This
This project demonstrates: 
- Dynamic UI rendering using data from an external API

- Clean, reusable component architecture

- Global state management with Context API

- Persistent favorites using browser localStorage

- Ability to design and implement a user-friendly front-end experience



##  How to Run the App

1. Navigate to the frontend folder:
   ```bash
   cd frontend

2. Run the development server
    ```bash
   npm run dev