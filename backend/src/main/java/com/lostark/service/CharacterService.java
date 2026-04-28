package com.lostark.service;

import com.lostark.dto.ArkGridDto;
import com.lostark.dto.ArkPassiveDto;
import com.lostark.dto.CardDto;
import com.lostark.dto.GemDto;
import com.lostark.dto.CharacterInfoDto;
import com.lostark.dto.EnrichedSiblingDto;
import com.lostark.dto.SiblingDto;
import com.lostark.dto.SkillDto;
import java.util.List;

public interface CharacterService {
    CharacterInfoDto getCharacterInfo(String characterName);
    List<SiblingDto> getSiblings(String characterName);
    List<EnrichedSiblingDto> getEnrichedSiblings(String characterName);
    List<SkillDto> getSkills(String characterName);
    ArkPassiveDto getArkPassive(String characterName);
    ArkGridDto getArkGrid(String characterName);
    CardDto getCards(String characterName);
    GemDto getGems(String characterName);
}
