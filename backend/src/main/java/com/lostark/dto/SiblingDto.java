package com.lostark.dto;

public record SiblingDto(
    String serverName,
    String characterName,
    String characterClassName,
    int characterLevel,
    String itemAvgLevel
) {}
