package com.lostark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ArmoryResponseDto(
    @JsonProperty("ArmoryProfile") Profile armoryProfile,
    @JsonProperty("ArmoryEquipment") List<Equipment> armoryEquipment,
    @JsonProperty("ArmoryEngraving") Engraving armoryEngraving,
    @JsonProperty("ArmorySkills") List<Skill> armorySkills,
    @JsonProperty("ArkPassive") ArkPassive arkPassive,
    @JsonProperty("ArmoryCard") ArmoryCard armoryCard,
    @JsonProperty("ArmoryGem") ArmoryGem armoryGem
) {
    public record Profile(
        @JsonProperty("ServerName") String serverName,
        @JsonProperty("CharacterName") String characterName,
        @JsonProperty("CharacterClassName") String characterClassName,
        @JsonProperty("ItemAvgLevel") String itemAvgLevel,
        @JsonProperty("CharacterImage") String characterImage
    ) {}

    public record Equipment(
        @JsonProperty("Type") String type,
        @JsonProperty("Name") String name,
        @JsonProperty("Grade") String grade,
        @JsonProperty("Icon") String icon,
        @JsonProperty("Tooltip") String tooltip
    ) {}

    public record Engraving(
        @JsonProperty("Engravings") List<EngravingItem> engravings
    ) {}

    public record EngravingItem(
        @JsonProperty("Name") String name,
        @JsonProperty("Level") int level
    ) {}

    /** /armories/characters/{name}/combat-skills 응답 구조 */
    public record Skill(
        @JsonProperty("Name") String name,
        @JsonProperty("Icon") String icon,
        @JsonProperty("Level") int level,
        @JsonProperty("Type") String type,
        @JsonProperty("SkillType") int skillType,
        @JsonProperty("Tripods") List<Tripod> tripods,
        @JsonProperty("Rune") SkillRune rune
    ) {}

    public record Tripod(
        @JsonProperty("Tier") int tier,
        @JsonProperty("Slot") int slot,
        @JsonProperty("Name") String name,
        @JsonProperty("Icon") String icon,
        @JsonProperty("IsSelected") boolean isSelected
    ) {}

    public record SkillRune(
        @JsonProperty("Name") String name,
        @JsonProperty("Icon") String icon,
        @JsonProperty("Grade") String grade
    ) {}

    public record ArkPassive(
        @JsonProperty("Title") String title,
        @JsonProperty("IsArkPassive") boolean isArkPassive,
        @JsonProperty("Points") List<ArkPassivePoint> points,
        @JsonProperty("Effects") List<ArkPassiveEffect> effects
    ) {}

    public record ArkPassivePoint(
        @JsonProperty("Name") String name,
        @JsonProperty("Value") int value,
        @JsonProperty("Description") String description
    ) {}

    public record ArkPassiveEffect(
        @JsonProperty("Name") String name,
        @JsonProperty("Description") String description,
        @JsonProperty("Icon") String icon,
        @JsonProperty("ToolTip") String tooltip
    ) {}

    public record ArmoryCard(
        @JsonProperty("Cards") List<CardItem> cards,
        @JsonProperty("Effects") List<CardEffect> effects
    ) {}

    public record CardItem(
        @JsonProperty("Slot") int slot,
        @JsonProperty("Name") String name,
        @JsonProperty("Icon") String icon,
        @JsonProperty("AwakeCount") int awakeCount,
        @JsonProperty("AwakeTotal") int awakeTotal,
        @JsonProperty("Grade") String grade
    ) {}

    public record CardEffect(
        @JsonProperty("Index") int index,
        @JsonProperty("Items") List<CardEffectItem> items
    ) {}

    public record CardEffectItem(
        @JsonProperty("Name") String name,
        @JsonProperty("Description") String description
    ) {}

    public record ArmoryGem(
        @JsonProperty("Gems") List<GemItem> gems,
        @JsonProperty("Effects") GemEffects effects
    ) {}

    public record GemItem(
        @JsonProperty("Slot") int slot,
        @JsonProperty("Name") String name,
        @JsonProperty("Icon") String icon,
        @JsonProperty("Level") int level,
        @JsonProperty("Grade") String grade
    ) {}

    /** Effects 는 { Description, Skills: [...] } 구조 */
    public record GemEffects(
        @JsonProperty("Description") String description,
        @JsonProperty("Skills") List<GemSkillEffect> skills
    ) {}

    public record GemSkillEffect(
        @JsonProperty("GemSlot") int gemSlot,
        @JsonProperty("Name") String name,
        @JsonProperty("Description") List<String> description,
        @JsonProperty("Icon") String icon
    ) {}

    public record Sibling(
        @JsonProperty("ServerName") String serverName,
        @JsonProperty("CharacterName") String characterName,
        @JsonProperty("CharacterClassName") String characterClassName,
        @JsonProperty("CharacterLevel") int characterLevel,
        @JsonProperty("ItemAvgLevel") String itemAvgLevel
    ) {}
}
