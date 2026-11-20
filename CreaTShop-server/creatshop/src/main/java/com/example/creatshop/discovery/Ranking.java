package com.example.creatshop.discovery;

import java.text.Normalizer;
import java.util.Locale;

public final class Ranking {
    private Ranking() {}

    public static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('\u0111', 'd').replace('\u0110', 'D')
                .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    public static double lexical(String query, String document) {
        String normalized = normalize(query);
        if (normalized.isEmpty()) return 0;
        String text = " " + normalize(document) + " ";
        String[] terms = normalized.split(" +");
        double matches = 0;
        for (String term : terms) if (text.contains(" " + term + " ")) matches++;
        return matches / terms.length;
    }

    public static double cosine(double[] left, double[] right) {
        if (left == null || right == null || left.length != right.length || left.length == 0) return 0;
        double dot = 0, leftNorm = 0, rightNorm = 0;
        for (int index = 0; index < left.length; index++) {
            if (!Double.isFinite(left[index]) || !Double.isFinite(right[index])) return 0;
            dot += left[index] * right[index];
            leftNorm += left[index] * left[index];
            rightNorm += right[index] * right[index];
        }
        return leftNorm == 0 || rightNorm == 0 ? 0 : dot / Math.sqrt(leftNorm * rightNorm);
    }

    public static boolean valid(double[] vector, int dimensions) {
        if (vector == null || vector.length != dimensions) return false;
        double norm = 0;
        for (double value : vector) {
            if (!Double.isFinite(value)) return false;
            norm += value * value;
        }
        return Double.isFinite(norm) && norm > 0;
    }
}
