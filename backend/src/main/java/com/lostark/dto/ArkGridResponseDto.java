package com.lostark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Lost Ark API /armories/characters/{name}/arkgrid 응답 구조 */
public record ArkGridResponseDto(
    @JsonProperty("Slots") List<Slot> slots,
    @JsonProperty("Effects") List<Effect> effects
) {
    public record Gem(
        @JsonProperty("Index") int index,
        @JsonProperty("Icon") String icon,
        @JsonProperty("IsActive") boolean isActive,
        @JsonProperty("Grade") String grade,
        @JsonProperty("Tooltip") String tooltip
    ) {}

    public record Slot(
        @JsonProperty("Index") int index,
        @JsonProperty("Icon") String icon,
        @JsonProperty("Name") String name,
        @JsonProperty("Point") int point,
        @JsonProperty("Grade") String grade,
        @JsonProperty("Tooltip") String tooltip,
        @JsonProperty("Gems") List<Gem> gems
    ) {}

    public record Effect(
        @JsonProperty("Name") String name,
        @JsonProperty("Level") int level,
        @JsonProperty("Tooltip") String tooltip
    ) {}
}
