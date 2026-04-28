package com.lostark.dto;

import java.util.List;

public record GemDto(
    List<Gem> gems
) {
    /** gem + skill effect 합쳐진 뷰 */
    public record Gem(
        int slot,
        String gemName,
        String gemIcon,
        int level,
        String grade,
        String skillName,
        String skillIcon,
        String effectDesc   // "피해 40.00% 증가" 등
    ) {}
}
