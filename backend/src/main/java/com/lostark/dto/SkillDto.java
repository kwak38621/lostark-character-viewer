package com.lostark.dto;

import java.util.List;

public record SkillDto(
    String name,
    String icon,
    int level,
    String type,      // "string" (예: "패시브", "무력화 하" 등)
    int skillType,    // 0=일반, 1=패시브 등
    List<Tripod> tripods,
    Rune rune
) {
    public record Tripod(
        int tier,
        int slot,
        String name,
        String icon,
        boolean isSelected
    ) {}

    public record Rune(
        String name,
        String icon,
        String grade
    ) {}
}
