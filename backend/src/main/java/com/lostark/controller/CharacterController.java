package com.lostark.controller;

import com.lostark.client.LostarkApiClient;
import com.lostark.dto.ArkGridDto;
import com.lostark.dto.ArkPassiveDto;
import com.lostark.dto.CardDto;
import com.lostark.dto.GemDto;
import com.lostark.dto.CharacterInfoDto;
import com.lostark.dto.EnrichedSiblingDto;
import com.lostark.dto.SiblingDto;
import com.lostark.dto.SkillDto;
import com.lostark.service.CharacterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/characters")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class CharacterController {

    private final CharacterService characterService;
    private final LostarkApiClient lostarkApiClient;

    @GetMapping("/{characterName}")
    public ResponseEntity<CharacterInfoDto> getCharacter(@PathVariable String characterName) {
        CharacterInfoDto result = characterService.getCharacterInfo(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/siblings")
    public ResponseEntity<List<SiblingDto>> getSiblings(@PathVariable String characterName) {
        List<SiblingDto> result = characterService.getSiblings(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/siblings/enriched")
    public ResponseEntity<List<EnrichedSiblingDto>> getEnrichedSiblings(@PathVariable String characterName) {
        List<EnrichedSiblingDto> result = characterService.getEnrichedSiblings(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/skills")
    public ResponseEntity<List<SkillDto>> getSkills(@PathVariable String characterName) {
        List<SkillDto> result = characterService.getSkills(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/arkpassive")
    public ResponseEntity<ArkPassiveDto> getArkPassive(@PathVariable String characterName) {
        ArkPassiveDto result = characterService.getArkPassive(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/arkgrid")
    public ResponseEntity<ArkGridDto> getArkGrid(@PathVariable String characterName) {
        ArkGridDto result = characterService.getArkGrid(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/cards")
    public ResponseEntity<CardDto> getCards(@PathVariable String characterName) {
        CardDto result = characterService.getCards(characterName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{characterName}/gems")
    public ResponseEntity<GemDto> getGems(@PathVariable String characterName) {
        GemDto result = characterService.getGems(characterName);
        return ResponseEntity.ok(result);
    }

    /** 디버그용: 실제 로아와 API 원문 확인 */
    @GetMapping("/{characterName}/debug")
    public ResponseEntity<String> debugRaw(
            @PathVariable String characterName,
            @RequestParam(defaultValue = "skills") String filters) {
        String raw = lostarkApiClient.fetchRaw(characterName, filters);
        return ResponseEntity.ok(raw);
    }
}
