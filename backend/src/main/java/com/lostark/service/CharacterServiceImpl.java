package com.lostark.service;

import com.lostark.dto.ArkGridDto;
import com.lostark.dto.ArkPassiveDto;
import com.lostark.dto.CardDto;
import com.lostark.dto.GemDto;
import com.lostark.dto.CharacterInfoDto;
import com.lostark.dto.EnrichedSiblingDto;
import com.lostark.dto.SiblingDto;
import com.lostark.dto.SkillDto;
import com.lostark.client.LostarkApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CharacterServiceImpl implements CharacterService {

    private final LostarkApiClient lostarkApiClient;

    @Override
    public CharacterInfoDto getCharacterInfo(String characterName) {
        return lostarkApiClient.fetchCharacterInfo(characterName);
    }

    @Override
    public List<SiblingDto> getSiblings(String characterName) {
        return lostarkApiClient.fetchSiblings(characterName);
    }

    @Override
    public List<EnrichedSiblingDto> getEnrichedSiblings(String characterName) {
        return lostarkApiClient.fetchEnrichedSiblings(characterName);
    }

    @Override
    public List<SkillDto> getSkills(String characterName) {
        return lostarkApiClient.fetchSkills(characterName);
    }

    @Override
    public ArkPassiveDto getArkPassive(String characterName) {
        return lostarkApiClient.fetchArkPassive(characterName);
    }

    @Override
    public ArkGridDto getArkGrid(String characterName) {
        return lostarkApiClient.fetchArkGrid(characterName);
    }

    @Override
    public CardDto getCards(String characterName) {
        return lostarkApiClient.fetchCards(characterName);
    }

    @Override
    public GemDto getGems(String characterName) {
        return lostarkApiClient.fetchGems(characterName);
    }
}
