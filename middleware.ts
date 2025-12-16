import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();

    // Define auth routes (publicly accessible only if NOT logged in)
    const authRoutes = ["/", "/login"];
    const isAuthRoute = authRoutes.includes(url.pathname);

    // User is Logged In
    if (user) {
        // If user tries to access auth routes, redirect to dashboard
        if (isAuthRoute) {
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }
        // Allow access to protected routes
        return response;
    }

    // User is NOT Logged In
    // If user tries to access auth routes, allow it
    if (isAuthRoute) {
        return response;
    }

    // Allow public report routes
    if (url.pathname.startsWith('/r/')) {
        return response;
    }

    // If user tries to access any other route (protected), redirect to login
    url.pathname = "/";
    return NextResponse.redirect(url);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes are typically handled separately or require Bearer tokens)
         */
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
};
