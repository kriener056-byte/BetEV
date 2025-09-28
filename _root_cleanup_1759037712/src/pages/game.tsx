import { useParams } from "react-router-dom";

export default function Game() {
  const { gameId } = useParams();
  return (
    <section className="mx-auto max-w-5xl">
      <h2 className="text-2xl font-semibold">Game: {gameId}</h2>
      <p className="mt-2 text-slate-600">
        Props, lines, and an SGPx builder will live here.
      </p>
    </section>
  );
}
