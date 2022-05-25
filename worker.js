importScripts("https://cdn.jsdelivr.net/pyodide/v0.20.0/full/pyodide.js");

async function initialize(){
    self.pyodide = await loadPyodide();
    await self.pyodide.loadPackage("pandas");
}

let initialized = initialize();


self.onmessage = async function(e){
    await initialized;
    const getCSV = new XMLHttpRequest();
    getCSV.open("GET", "https://raw.githubusercontent.com/amirtds/kaggle-netflix-tv-shows-and-movies/main/titles.csv", true);
    getCSV.send(null);
    getCSV.onreadystatechange = async function() {
        if (getCSV.readyState === 4) {
            if (getCSV.status === 200) {
                const titlesCSV = getCSV.responseText;
                self.pyodide.globals.set("titlesCSV", titlesCSV);
                getCSV.onreadystatechange = null;
                let titlesList, recommenedMovies, recommendedShows, yearMostMovies, yearMostShows = await self.pyodide.runPythonAsync(`
                    import pandas as pd
                    import io
                    csv_buffer = io.StringIO(titlesCSV)
                    all_titles = pd.read_csv(csv_buffer)
                    # 2. Sanitizing the data
                    # Drop unnecessary columns
                    all_titles = all_titles.drop(
                        columns=[
                            "age_certification",
                            "seasons",
                            "imdb_id",
                        ]
                    )
                    # Drop rows with null values for important columns
                    sanitized_titles = all_titles.dropna(
                        subset=[
                            "id",
                            "title",
                            "release_year",
                            "genres",
                            "production_countries",
                            "imdb_score",
                            "imdb_votes",
                            "tmdb_score",
                        ]
                    )
                    sanitized_titles.head(10).to_json(orient="table")

                    # 3. Create recommendation list for Shows and Movies
                    # 3.1 add new colum recommendation_score
                    recommened_titles = sanitized_titles.copy()
                    # Set recommendation score based on imdb votes, imdb score, tmdb score and popularity
                    recommened_titles["recommendation_score"] = (
                        sanitized_titles["imdb_votes"] * 0.4
                        + sanitized_titles["imdb_score"] * 0.3
                        + sanitized_titles["tmdb_score"] * 0.2
                        + sanitized_titles["tmdb_popularity"] * 0.2
                    )

                    recommened_movies = recommened_titles.loc[recommened_titles["type"] == "MOVIE"].sort_values(
                        by="recommendation_score", ascending=False
                    )

                    recommended_shows = recommened_titles.loc[recommened_titles["type"] == "SHOW"].sort_values(
                        by="recommendation_score", ascending=False
                    )

                    recommened_movies.head(5).to_json(orient="table")
                    recommended_shows.head(5).to_json(orient="table")
                    # 4. Get year that produced the most movies and titles
                    sanitized_titles.loc[recommened_titles["type"] == "MOVIE"].groupby("release_year").count()["id"].sort_values(ascending=False).head(1)
                    sanitized_titles.loc[recommened_titles["type"] == "SHOW"].groupby("release_year").count()["id"].sort_values(ascending=False).head(1)
                `);
            self.postMessage({"titles": titlesList, "recommendedMovies": recommenedMovies, "recommendedShows": recommendedShows, "yearMostMovies": yearMostMovies, "yearMostShows": yearMostShows});
            }
        }
    };



}