import { Router } from "express";
import multer from "multer";
import { z } from "zod";

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
      photos.map(async (photo: any) => ({
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

    const { id: userId } = (req as AuthedRequest).user;
    const dateStr = req.body.date || new Date().toISOString().slice(0, 10);
    const label = req.body.label || "Check-in Photo";

    const { storageKey } = await storageProvider.save({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      buffer: req.file.buffer,
      folder: "progress-photos",
    });

    const photo = await prisma.progressPhoto.create({
      data: {
        userId,
        date: new Date(dateStr),
        label,
        fileUrl: storageKey,
        notes: req.body.notes,
      },
    });

    res.status(201).json({ photo });
  } catch (error) {
    next(error);
  }
});

export const progressPhotosRouter = router;
