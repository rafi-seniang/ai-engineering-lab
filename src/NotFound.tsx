import { Link } from "react-router";

export function NotFound() {
  return (
    <main className="not-found">
      <h1>Nothing at this address</h1>
      <p>The project may still be planned. Every service and its status is listed in the lobby.</p>
      <Link to="/">Back to the lobby</Link>
    </main>
  );
}
