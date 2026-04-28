package com.lostark.dto;

import java.util.List;

public record CardDto(
    List<Card> cards,
    List<Effect> effects
) {
    public record Card(
        int slot,
        String name,
        String icon,
        int awakeCount,
        int awakeTotal,
        String grade
    ) {}

    public record EffectItem(
        String name,
        String description
    ) {}

    public record Effect(
        int index,
        List<EffectItem> items
    ) {}
}
