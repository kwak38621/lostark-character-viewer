package com.lostark.dto;

import java.util.List;

public record ArkPassiveDto(
    boolean isArkPassive,
    String title,
    List<Point> points,
    List<Effect> effects
) {
    public record Point(String name, int value, String description) {}

    public record Effect(
        String name,        // 진화 / 깨달음 / 도약
        String description, // "깨달음 1티어 신속한 일격 Lv.1"
        String icon,
        String tooltip      // 원본 ToolTip JSON 문자열
    ) {}
}
