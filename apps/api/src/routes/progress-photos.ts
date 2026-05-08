import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { ProgressPhoto } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { storageProvider } from "../lib/storage.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const progressPhotoInputSchema = z.object({
  date: z
    .string()
    .optional()
    .transform((value) => value ?? new Date().toISOString().slice(0, 10)),
  label: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional()
    .transform((value) => value ?? "Check-in Photo"),
  notes: z.string().trim().max(1000).optional(),
});

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { id } = (req as AuthedRequest).user;
    const photos = await prisma.progressPhoto.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
    });

    // Provide signed URLs if needed by the provider
    const photosWithUrls = await Promise.all(
      photos.map(async (photo: ProgressPhoto) => ({
        ...photo,
        fileUrl: storageProvider.getSignedReadUrl
          ? await storageProvider.getSignedReadUrl(photo.fileUrl)
          : photo.fileUrl,
      })),
    );

    res.json({ photos: photosWithUrls });
  } catch (error) {
    next(error);
  }
});

router.post("/", upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No photo uploaded." });
    }

    if (!allowedMimeTypes.has(req.file.mimetype)) {
      return res.status(400).json({
        message: "Unsupported image type. Use JPEG, PNG, or WebP.",
      });
    }

    const { id: userId } = (req as AuthedRequest).user;
    const input = progressPhotoInputSchema.parse(req.body);

    const { storageKey } = await storageProvider.save({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      buffer: req.file.buffer,
      folder: "progress-photos",
    });

    const photo = await prisma.progressPhoto.create({
      data: {
        userId,
        date: new Date(input.date),
        label: input.label,
        fileUrl: storageKey,
        notes: input.notes,
      },
    });

    res.status(201).json({ photo });
  } catch (error) {
    next(error);
  }
});

export const progressPhotosRouter = router;
