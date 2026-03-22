import certifi
from pymongo import MongoClient

MONGO_URL = "mongodb+srv://photos51520007_db_user:MpFSwkUZgzJOik01@sample.9rnludv.mongodb.net/mughals_dastarkhan?retryWrites=true&w=majority"

print("Connecting to MongoDB Atlas with certifi...")
try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000, tlsCAFile=certifi.where())
    client.admin.command("ping")
    print("CONNECTED OK")
    db = client["mughals_dastarkhan"]
    count = db.users.count_documents({})
    print(f"Users in DB: {count}")
    users = list(db.users.find({}, {"email": 1, "name": 1, "_id": 0}))
    print("Users:", users)
    print("Collections:", db.list_collection_names())
    client.close()
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)[:300]}")
