# StudyChain

StudyChain is a decentralized learning platform for college students.
Files are uploaded to IPFS through FastAPI + Pinata, while metadata and likes are stored in Firebase Cloud Firestore.

## Tech Stack

- Frontend: React (Vite) + Tailwind CSS
- Backend: FastAPI (Python)
- Storage: IPFS via Pinata API
- Auth + DB: Firebase Authentication (Google) + Cloud Firestore

## What It Supports

- Hierarchical learning discovery: Branch -> Year -> Semester -> Subject -> Chapter
- Login/logout with Google authentication
- Upload notes to IPFS and persist metadata in Firestore
- Debounced search by filename, subject, chapter, and tags
- Like notes (auth required)
- Top Notes section (most liked)
- My Uploads page (current user only)
- Ethereum-ready metadata fields (`cid`, `uploadedBy`) for future contract anchoring

## Academic Hierarchy Source

The predefined structure is stored at:

- `backend/data/structure.py`

Frontend uses `GET /structure` for dropdowns and sidebar navigation.

## Project Structure

```text
backend/
	main.py
	data/
		structure.py
	models/
		note.py
	routes/
		notes.py
	services/
		ipfs.py

frontend/src/
	context/
		AuthContext.jsx
	components/
		Sidebar.jsx
		NoteCard.jsx
		UploadForm.jsx
	pages/
		Explore.jsx
		Upload.jsx
		MyUploads.jsx
	services/
		api.js
		firebase.js
		firestore.js
	App.jsx
```

## Backend Setup

```powershell
Set-Location .\backend
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

`backend/.env` values:

- `PINATA_API_KEY`
- `PINATA_SECRET_API_KEY`
- `PINATA_JWT` (optional)
- `CORS_ORIGINS` (comma-separated)

## Frontend Setup

```powershell
Set-Location .\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Or from workspace root:

```powershell
Set-Location .
npm run dev
```

Root scripts proxy to the frontend app.

`frontend/.env` values:

- `VITE_API_BASE_URL` (example: `http://localhost:8000`)
- `VITE_IPFS_GATEWAY` (example: `https://gateway.pinata.cloud/ipfs`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Important: you can run frontend either from `frontend` or from workspace root using the root scripts.

## Firebase Console Setup

1. Create a Firebase project.
2. In Authentication -> Sign-in method, enable Google provider.
3. In Authentication -> Settings -> Authorized domains, add your local domain if needed.
4. Create a Web app and copy config values into `frontend/.env`.
5. In Firestore Database, create a database in production or test mode.
6. Deploy the provided `firestore.rules` to lock uploads/updates to authenticated users.

## Upload Flow

1. User logs in with Google.
2. Frontend sends file + metadata to `POST /upload` (FastAPI).
3. Backend uploads file to IPFS (Pinata) and returns CID.
4. Frontend writes note metadata to Firestore `notes` collection.

## Firestore Notes Document Shape

Each `notes` document stores:

- `cid`
- `filename`
- `branch`
- `year`
- `semester`
- `subject`
- `chapter`
- `tags` (array)
- `uploadedBy` (Firebase UID)
- `uploadedByName`
- `likes` (number)
- `createdAt` (timestamp)

## API Endpoints (FastAPI)

- `GET /health`
- `GET /structure`
- `POST /upload`
  - form-data: `file`, `branch`, `year`, `semester`, `subject`, `chapter`, `tags`, `uploadedBy`

## Firestore Rules

Basic rules template is provided in `firestore.rules`.
Deploy with Firebase CLI after setting your project:

```powershell
firebase deploy --only firestore:rules
```

## Notes

- Upload and like actions are gated behind authentication in the frontend.
- Backend in-memory note routes still exist for local development compatibility, but Firestore is the source of truth for frontend exploration.
