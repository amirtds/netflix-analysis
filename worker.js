importScripts("https://cdn.jsdelivr.net/pyodide/v0.20.0/full/pyodide.js");

async function initialize(){
    self.pyodide = await loadPyodide();
    await self.pyodide.loadPackage("pandas");
}

let initialized = initialize();


self.onmessage = async function(e){
    await initialized;
    let titles_list = await self.pyodide.runPythonAsync(`
        import pandas as pd
        from pyodide.http import pyfetch
        response = await pyfetch("https://raw.githubusercontent.com/amirtds/kaggle-netflix-tv-shows-and-movies/main/titles.csv")
        if response.status == 200:
            with open("titles.csv", "wb") as f:
                f.write(await response.bytes())
        # 1. loading the csv file
        all_titles = pd.read_csv("titles.csv")
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
    `);
    self.postMessage({"type": "titles", "data": titles_list});
}