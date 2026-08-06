from config.gcp_config import db


class FirestoreClient:
    """
    Production Firestore client used by dispatch engine.
    Handles technicians, service requests and dispatch results.
    """

    def __init__(self):
        self.db = db

        # Collections
        self.technicians_collection = self.db.collection("technicians")
        self.requests_collection = self.db.collection("service_requests")
        self.dispatch_collection = self.db.collection("dispatch_results")

    # ----------------------------
    # Technician Methods
    # ----------------------------

    def get_all_technicians(self):
        """Fetch all technicians from Firestore"""

        technicians = []

        docs = self.technicians_collection.stream()

        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            technicians.append(data)

        return technicians

    def add_technician(self, technician_data):
        """Add a technician to Firestore"""

        _, doc_ref = self.technicians_collection.add(technician_data)
        return doc_ref.id

    # ----------------------------
    # Service Request Methods
    # ----------------------------

    def add_service_request(self, request_data):

        _, doc_ref = self.requests_collection.add(request_data)
        return doc_ref.id

    def get_pending_requests(self):

        docs = self.requests_collection.where(
            "status", "==", "pending"
        ).stream()

        requests = []

        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            requests.append(data)

        return requests

    # ----------------------------
    # Dispatch Result
    # ----------------------------

    def save_dispatch_result(self, result):

        _, doc_ref = self.dispatch_collection.add(result)
        return doc_ref.id