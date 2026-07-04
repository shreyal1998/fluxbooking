"use server";

import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import bcrypt from "bcrypt";
import crypto from "crypto";

/**
 * Handles requesting a password reset link.
 * Generates a secure, expiring token and sends it via email.
 */
export async function requestPasswordReset(email: string) {
  if (!email) {
    return { success: false, error: "Email is required." };
  }

  try {
    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success true to prevent email enumeration (security best practice),
      // while logging it internally in dev mode.
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      return { success: true };
    }

    // 2. Clear out any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // 3. Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // 4. Set expiration to 2 hours from now
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // 5. Save the token in the database
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // 6. Send the reset email
    await sendPasswordResetEmail({ email, token });

    return { success: true };
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Validates the reset token and updates the user's password in the database.
 */
export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    return { success: false, error: "Invalid token or password." };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  try {
    // 1. Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return { success: false, error: "Invalid or expired password reset link." };
    }

    // 2. Check if expired
    if (resetToken.expires < new Date()) {
      // Clean up the expired token
      await prisma.passwordResetToken.delete({
        where: { token },
      });
      return { success: false, error: "This password reset link has expired." };
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update the user password
    await prisma.user.update({
      where: { email: resetToken.email },
      data: {
        password: hashedPassword,
      },
    });

    // 5. Clean up/delete the token so it can't be reused
    await prisma.passwordResetToken.delete({
      where: { token },
    });

    return { success: true };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return { success: false, error: "Could not reset password. Please try again." };
  }
}
