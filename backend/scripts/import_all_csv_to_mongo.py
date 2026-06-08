from pathlib import Path
from pymongo import MongoClient
import pandas as pd
import math

# =========================
# CONFIG
# =========================
MONGO_URI = "mongodb://127.0.0.1:27017/"
DB_NAME = "smartdevis_ai"
BASE_DIR = Path(__file__).resolve().parent

FILES_PATTERNS = {
    "dim_categorie_": "dim_categorie*.csv",
    "dim_cout_": "dim_cout*.csv",
    "dim_devise_": "dim_devise*.csv",
    "dim_projet_": "dim_projet*.csv",
    "dim_personnel_": "dim_personnel*.csv",
    "fact_ligne_devis_": "fact_ligne_devis*.csv",
    "dim_coutt_": "dim_coutt_corrige.csv",
}

DATE_COLUMNS = {
    "dim_devise": ["date_taux"],
    "dim_projet": ["date_devis"],
}

# =========================
# HELPERS
# =========================
def find_file(pattern: str):
    files = list(BASE_DIR.glob(pattern))
    if not files:
        return None
    return files[0]


def read_csv_flexible(path: Path) -> pd.DataFrame:
    encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252"]
    separators = [";", ","]

    last_error = None

    for enc in encodings:
        for sep in separators:
            try:
                df = pd.read_csv(path, sep=sep, encoding=enc)
                if len(df.columns) > 1:
                    return df
            except Exception as e:
                last_error = e

    raise RuntimeError(f"Impossible de lire {path.name}: {last_error}")


def clean_value(value):
    if pd.isna(value):
        return None

    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()

    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass

    if isinstance(value, float):
        if math.isnan(value):
            return None
        return float(value)

    return value


def clean_dataframe(df: pd.DataFrame, collection_name: str) -> pd.DataFrame:
    df.columns = [str(col).strip().lower() for col in df.columns]

    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)

    if "appui_siege" in df.columns:
        df["appui_siege"] = (
            df["appui_siege"]
            .astype(str)
            .str.strip()
            .str.lower()
            .replace({
                "1": True,
                "0": False,
                "true": True,
                "false": False,
                "oui": True,
                "non": False,
                "nan": None,
                "none": None
            })
        )

    for col in DATE_COLUMNS.get(collection_name, []):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    return df


def dataframe_to_records(df: pd.DataFrame):
    records = []

    for _, row in df.iterrows():
        record = {col: clean_value(val) for col, val in row.to_dict().items()}
        records.append(record)

    return records


def import_collection(db, collection_name: str, pattern: str):
    file_path = find_file(pattern)

    if not file_path:
        print(f"[SKIP] Aucun fichier trouvé pour: {pattern}")
        return

    print(f"[INFO] Lecture de {file_path.name} -> collection {collection_name}")

    df = read_csv_flexible(file_path)
    df = clean_dataframe(df, collection_name)
    records = dataframe_to_records(df)

    collection = db[collection_name]
    collection.delete_many({})

    if records:
        collection.insert_many(records)
        print(f"[OK] {len(records)} documents importés dans '{collection_name}'")
    else:
        print(f"[WARN] Aucun document à insérer dans '{collection_name}'")


# =========================
# MAIN
# =========================
def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    print(f"[INFO] Connexion à MongoDB: {DB_NAME}")

    for collection_name, pattern in FILES_PATTERNS.items():
        import_collection(db, collection_name, pattern)

    client.close()

    print("[DONE] Import terminé avec succès.")


if __name__ == "__main__":
    main()