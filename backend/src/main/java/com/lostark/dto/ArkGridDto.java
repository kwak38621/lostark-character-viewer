package com.lostark.dto;

import java.util.List;

public record ArkGridDto(
    List<Slot> slots,
    List<Effect> effects
) {
    public record Gem(
        int index,
        String icon,
        boolean isActive,
        String grade,
        String tooltip
    ) {}

    public record Slot(
        int index,
        String icon,
        String name,
        int point,
        String grade,
        String tooltip,
        List<Gem> gems
    ) {}

    public record Effect(
        String name,
        int level,
        String tooltip
    ) {}
}
