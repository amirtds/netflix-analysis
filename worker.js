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
                let titles_list = await self.pyodide.runPythonAsync(`
                    import pandas as pd
                    all_titles = pd.read_csv(titlesCSV)
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
            self.postMessage({"type": "titles", "titles": titles_list});
            }
        }
    };



}