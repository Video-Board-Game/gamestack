from firebase_admin import firestore

db = firestore.client()

def add_user(user_id, name, email):
    """Adds a user to Firestore"""
    doc_ref = db.collection("users").document(user_id)
    doc_ref.set({"name": name, "email": email})
    return f"User {name} added."

def get_user(user_id):
    """Retrieves a user from Firestore"""
    user_doc = db.collection("users").document(user_id).get()
    if user_doc.exists:
        return user_doc.to_dict()
    return None
