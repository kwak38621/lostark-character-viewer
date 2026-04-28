package com.lostark.exception;

public class CharacterNotFoundException extends RuntimeException {
    public CharacterNotFoundException(String characterName) {
        super("캐릭터를 찾을 수 없습니다: " + characterName);
    }
}
