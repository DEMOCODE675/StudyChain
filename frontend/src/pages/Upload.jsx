import UploadForm from "../components/UploadForm";

export default function Upload({ structure, user, onRequestLogin, onUploadSuccess }) {
    return (
        <section className="space-y-4">
            <header className="rounded-2xl border border-zinc-300 bg-white p-5 md:p-6">
                {/*<p className="mono text-xs uppercase tracking-[0.14em] text-zinc-500">Contribute</p>*/}
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Upload Notes</h2>
            </header>

            <UploadForm
                structure={structure}
                user={user}
                onRequestLogin={onRequestLogin}
                onUploaded={onUploadSuccess}
            />
        </section>
    );
}
