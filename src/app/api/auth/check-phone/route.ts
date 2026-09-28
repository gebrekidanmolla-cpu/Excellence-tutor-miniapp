import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { canonicalEthiopianPhone } from "@/lib/phone";

/**
 * Lets the registration wizard reject a taken phone number on step 1, rather
 * than after the tutor has filled in everything and uploaded their documents.
 * The register route still enforces uniqueness itself.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = canonicalEthiopianPhone(String(body.phone ?? ""));

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          field: "phone",
          message: "Please enter a valid Ethiopian mobile number.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.tutor.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          field: "phone",
          message: "An account with this phone number already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Check phone error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to check the phone number." },
      { status: 500 }
    );
  }
}
