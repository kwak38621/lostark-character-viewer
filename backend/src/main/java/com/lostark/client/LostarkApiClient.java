package com.lostark.client;

import com.lostark.dto.ArmoryResponseDto;
import com.lostark.dto.ArkGridDto;
import com.lostark.dto.ArkGridResponseDto;
import com.lostark.dto.ArkPassiveDto;
import com.lostark.dto.CardDto;
import com.lostark.dto.CharacterInfoDto;
import com.lostark.dto.GemDto;
import com.lostark.dto.EnrichedSiblingDto;
import com.lostark.dto.SiblingDto;
import com.lostark.dto.SkillDto;
import com.lostark.exception.CharacterNotFoundException;
import com.lostark.exception.LostarkApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.http.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
public class LostarkApiClient {

    private static final Logger log = LoggerFactory.getLogger(LostarkApiClient.class);

    @Value("${lostark.api.key}")
    private String apiKey;

    @Value("${lostark.api.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;

    /** 디버그용: 실제 API 응답 원문 반환 */
    public String fetchRaw(String characterName, String filters) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}")
            .queryParam("filters", filters)
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, entity, String.class);
        String body = response.getBody();
        log.info("[DEBUG] filters={} response={}", filters, body);
        return body;
    }

    public CharacterInfoDto fetchCharacterInfo(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}")
            .queryParam("filters", "profiles+equipment+engravings")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<ArmoryResponseDto> response;
        try {
            response = restTemplate.exchange(uri, HttpMethod.GET, entity, ArmoryResponseDto.class);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 404) {
                throw new CharacterNotFoundException(characterName);
            }
            throw e;
        } catch (Exception e) {
            throw new LostarkApiException("캐릭터 정보를 가져오지 못했습니다.", e);
        }

        ArmoryResponseDto armory = response.getBody();
        if (armory == null || armory.armoryProfile() == null) {
            throw new CharacterNotFoundException(characterName);
        }

        ArmoryResponseDto.Profile profile = armory.armoryProfile();

        List<CharacterInfoDto.EquipmentItem> equipment = armory.armoryEquipment() == null
            ? Collections.emptyList()
            : armory.armoryEquipment().stream()
                .map(e -> new CharacterInfoDto.EquipmentItem(e.type(), e.name(), e.grade(), e.icon(), e.tooltip()))
                .toList();

        List<CharacterInfoDto.Engraving> engravings =
            (armory.armoryEngraving() == null || armory.armoryEngraving().engravings() == null)
            ? Collections.emptyList()
            : armory.armoryEngraving().engravings().stream()
                .map(e -> new CharacterInfoDto.Engraving(e.name(), e.level()))
                .toList();

        return new CharacterInfoDto(
            profile.serverName(),
            profile.characterName(),
            profile.characterClassName(),
            profile.itemAvgLevel(),
            profile.characterImage(),
            equipment,
            engravings
        );
    }

    public List<SiblingDto> fetchSiblings(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/characters/{characterName}/siblings")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<List<ArmoryResponseDto.Sibling>> response = restTemplate.exchange(
            uri, HttpMethod.GET, entity, new ParameterizedTypeReference<List<ArmoryResponseDto.Sibling>>() {}
        );

        List<ArmoryResponseDto.Sibling> body = response.getBody();
        if (body == null) return Collections.emptyList();

        return body.stream()
            .map(s -> new SiblingDto(
                s.serverName(),
                s.characterName(),
                s.characterClassName(),
                s.characterLevel(),
                s.itemAvgLevel()
            ))
            .toList();
    }

    public List<SkillDto> fetchSkills(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}/combat-skills")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<List<ArmoryResponseDto.Skill>> response = restTemplate.exchange(
            uri, HttpMethod.GET, entity, new ParameterizedTypeReference<List<ArmoryResponseDto.Skill>>() {}
        );

        List<ArmoryResponseDto.Skill> body = response.getBody();
        if (body == null) return Collections.emptyList();

        return body.stream()
            .filter(s -> s.level() > 1) // level 1 = 포인트 미투자 기본 상태, 2 이상 = 착용중
            .map(s -> new SkillDto(
                s.name(),
                s.icon(),
                s.level(),
                s.type(),
                s.skillType(),
                s.tripods() == null ? Collections.emptyList() : s.tripods().stream()
                    .filter(ArmoryResponseDto.Tripod::isSelected)
                    .map(t -> new SkillDto.Tripod(t.tier(), t.slot(), t.name(), t.icon(), t.isSelected()))
                    .toList(),
                s.rune() == null ? null : new SkillDto.Rune(s.rune().name(), s.rune().icon(), s.rune().grade())
            ))
            .toList();
    }

    public List<EnrichedSiblingDto> fetchEnrichedSiblings(String characterName) {
        List<SiblingDto> siblings = fetchSiblings(characterName);

        List<CompletableFuture<EnrichedSiblingDto>> futures = siblings.stream()
            .map(s -> CompletableFuture.supplyAsync(() -> {
                try {
                    URI uri = UriComponentsBuilder
                        .fromHttpUrl(baseUrl + "/armories/characters/{characterName}")
                        .queryParam("filters", "profiles+arkpassive")
                        .buildAndExpand(s.characterName())
                        .encode()
                        .toUri();

                    HttpHeaders headers = new HttpHeaders();
                    headers.set("Authorization", "bearer " + apiKey);
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    HttpEntity<Void> entity = new HttpEntity<>(headers);
                    ResponseEntity<ArmoryResponseDto> response = restTemplate.exchange(
                        uri, HttpMethod.GET, entity, ArmoryResponseDto.class
                    );

                    ArmoryResponseDto armory = response.getBody();
                    String image = null;
                    String enlightenmentDesc = null;

                    if (armory != null) {
                        if (armory.armoryProfile() != null) {
                            image = armory.armoryProfile().characterImage();
                        }
                        if (armory.arkPassive() != null && armory.arkPassive().effects() != null) {
                            enlightenmentDesc = armory.arkPassive().effects().stream()
                                .filter(e -> "깨달음".equals(e.name()))
                                .findFirst()
                                .map(ArmoryResponseDto.ArkPassiveEffect::description)
                                .orElse(null);
                        }
                    }

                    return new EnrichedSiblingDto(
                        s.serverName(), s.characterName(), s.characterClassName(),
                        s.characterLevel(), s.itemAvgLevel(), image, enlightenmentDesc
                    );
                } catch (Exception e) {
                    log.warn("Failed to fetch enriched data for {}: {}", s.characterName(), e.getMessage());
                    return new EnrichedSiblingDto(
                        s.serverName(), s.characterName(), s.characterClassName(),
                        s.characterLevel(), s.itemAvgLevel(), null, null
                    );
                }
            }))
            .toList();

        return futures.stream().map(CompletableFuture::join).toList();
    }

    public ArkGridDto fetchArkGrid(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}/arkgrid")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<ArkGridResponseDto> response = restTemplate.exchange(
            uri, HttpMethod.GET, entity, ArkGridResponseDto.class
        );

        ArkGridResponseDto body = response.getBody();
        if (body == null) return new ArkGridDto(Collections.emptyList(), Collections.emptyList());

        List<ArkGridDto.Slot> slots = body.slots() == null ? Collections.emptyList()
            : body.slots().stream().map(s -> new ArkGridDto.Slot(
                s.index(), s.icon(), s.name(), s.point(), s.grade(), s.tooltip(),
                s.gems() == null ? Collections.emptyList()
                    : s.gems().stream().map(g -> new ArkGridDto.Gem(
                        g.index(), g.icon(), g.isActive(), g.grade(), g.tooltip()
                    )).toList()
            )).toList();

        List<ArkGridDto.Effect> effects = body.effects() == null ? Collections.emptyList()
            : body.effects().stream().map(e -> new ArkGridDto.Effect(
                e.name(), e.level(), e.tooltip()
            )).toList();

        return new ArkGridDto(slots, effects);
    }

    public GemDto fetchGems(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}")
            .queryParam("filters", "gems")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<ArmoryResponseDto> response = restTemplate.exchange(
            uri, HttpMethod.GET, entity, ArmoryResponseDto.class
        );

        ArmoryResponseDto armory = response.getBody();
        if (armory == null || armory.armoryGem() == null) {
            return new GemDto(Collections.emptyList());
        }

        ArmoryResponseDto.ArmoryGem ag = armory.armoryGem();
        if (ag.gems() == null) return new GemDto(Collections.emptyList());

        // slot → skill effect 매핑
        java.util.Map<Integer, ArmoryResponseDto.GemSkillEffect> skillBySlot = new java.util.HashMap<>();
        if (ag.effects() != null && ag.effects().skills() != null) {
            for (ArmoryResponseDto.GemSkillEffect s : ag.effects().skills()) {
                skillBySlot.put(s.gemSlot(), s);
            }
        }

        List<GemDto.Gem> gems = ag.gems().stream().map(g -> {
            ArmoryResponseDto.GemSkillEffect skill = skillBySlot.get(g.slot());
            String effectDesc = (skill != null && skill.description() != null && !skill.description().isEmpty())
                ? skill.description().get(0) : "";
            // gem name 에서 HTML 제거
            String gemName = g.name().replaceAll("<[^>]*>", "").trim();
            return new GemDto.Gem(
                g.slot(), gemName, g.icon(), g.level(), g.grade(),
                skill != null ? skill.name() : "",
                skill != null ? skill.icon() : "",
                effectDesc
            );
        }).toList();

        return new GemDto(gems);
    }

    public CardDto fetchCards(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}")
            .queryParam("filters", "cards")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<ArmoryResponseDto> response = restTemplate.exchange(
            uri, HttpMethod.GET, entity, ArmoryResponseDto.class
        );

        ArmoryResponseDto armory = response.getBody();
        if (armory == null || armory.armoryCard() == null) {
            return new CardDto(Collections.emptyList(), Collections.emptyList());
        }

        ArmoryResponseDto.ArmoryCard ac = armory.armoryCard();

        List<CardDto.Card> cards = ac.cards() == null ? Collections.emptyList()
            : ac.cards().stream().map(c -> new CardDto.Card(
                c.slot(), c.name(), c.icon(), c.awakeCount(), c.awakeTotal(), c.grade()
            )).toList();

        List<CardDto.Effect> effects = ac.effects() == null ? Collections.emptyList()
            : ac.effects().stream().map(e -> new CardDto.Effect(
                e.index(),
                e.items() == null ? Collections.emptyList()
                    : e.items().stream().map(i -> new CardDto.EffectItem(i.name(), i.description())).toList()
            )).toList();

        return new CardDto(cards, effects);
    }

    public ArkPassiveDto fetchArkPassive(String characterName) {
        URI uri = UriComponentsBuilder
            .fromHttpUrl(baseUrl + "/armories/characters/{characterName}")
            .queryParam("filters", "arkpassive")
            .buildAndExpand(characterName)
            .encode()
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<ArmoryResponseDto> response = restTemplate.exchange(
            uri, HttpMethod.GET, entity, ArmoryResponseDto.class
        );

        ArmoryResponseDto armory = response.getBody();
        if (armory == null || armory.arkPassive() == null) {
            return new ArkPassiveDto(false, null, Collections.emptyList(), Collections.emptyList());
        }

        ArmoryResponseDto.ArkPassive ap = armory.arkPassive();
        return new ArkPassiveDto(
            ap.isArkPassive(),
            ap.title(),
            ap.points() == null ? Collections.emptyList() : ap.points().stream()
                .map(p -> new ArkPassiveDto.Point(p.name(), p.value(), p.description()))
                .toList(),
            ap.effects() == null ? Collections.emptyList() : ap.effects().stream()
                .map(e -> new ArkPassiveDto.Effect(e.name(), e.description(), e.icon(), e.tooltip()))
                .toList()
        );
    }
}
