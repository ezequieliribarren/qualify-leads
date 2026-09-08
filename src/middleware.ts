import withAuth from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // Protege todo menos login, api/auth, assets y el webhook de Evolution.
  matcher: ["/((?!login|api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
