import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { getSignedDownloadUrl } from "@/lib/r2";

const ALLOWED_DOCUMENTS = {
  transcript: "transcriptUrl",
  entranceResult: "entranceResultUrl",
  graduationDocument: "graduationDocumentUrl",
  cv: "cvUrl",
  governmentId: "governmentIdUrl",
} as const;

type DocumentType = keyof typeof ALLOWED_DOCUMENTS;

type RouteContext = {
  params: Promise<{
    id: string;
    document: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    // =====================================================
    // ADMIN AUTHENTICATION
    // =====================================================

    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // ROUTE PARAMETERS
    // =====================================================

    const { id, document } = await params;

    if (
      !Object.prototype.hasOwnProperty.call(
        ALLOWED_DOCUMENTS,
        document
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid document type.",
        },
        { status: 400 }
      );
    }

    const documentType =
      document as DocumentType;

    const fieldName =
      ALLOWED_DOCUMENTS[documentType];

    // =====================================================
    // FIND TUTOR
    // =====================================================

    const tutor = await prisma.tutor.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        [fieldName]: true,
      },
    });

    if (!tutor) {
      return NextResponse.json(
        {
          success: false,
          message: "Tutor not found.",
        },
        { status: 404 }
      );
    }

    const storagePath =
      tutor[fieldName as keyof typeof tutor];

    if (
      typeof storagePath !== "string" ||
      !storagePath
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Document not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // GENERATE SIGNED URL
    // =====================================================

    let signedUrl: string;

    try {
      signedUrl =
        await getSignedDownloadUrl(
          storagePath,
          60 * 10 // 10 minutes
        );
    } catch (error) {
      console.error(
        "Failed to create signed document URL:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to access the document.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // REDIRECT TO STORED DOCUMENT
    // =====================================================

    return NextResponse.redirect(
      signedUrl
    );
  } catch (error) {
    console.error(
      "Admin document access error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while opening the document.",
      },
      { status: 500 }
    );
  }
}