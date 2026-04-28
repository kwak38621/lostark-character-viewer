package com.lostark.dto;

import java.util.List;

public record CharacterInfoDto(
    String serverName,
    String characterName,
    String characterClassName,
    String itemAvgLevel,
    String characterImage,
    List<EquipmentItem> equipment,
    List<Engraving> engravings
) {
    public record EquipmentItem(
        String type,
        String name,
        String grade,
        String icon,
        String tooltip
    ) {}

    public record Engraving(
        String name,
        int level
    ) {}
}
