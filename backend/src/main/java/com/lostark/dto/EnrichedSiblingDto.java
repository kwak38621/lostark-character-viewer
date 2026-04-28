package com.lostark.dto;

public record EnrichedSiblingDto(
    String serverName,
    String characterName,
    String characterClassName,
    int characterLevel,
    String itemAvgLevel,
    String characterImage,        // null 가능
    String enlightenmentNodeDesc  // 깨달음 첫 번째 노드 description 원문, null 가능
) {}
