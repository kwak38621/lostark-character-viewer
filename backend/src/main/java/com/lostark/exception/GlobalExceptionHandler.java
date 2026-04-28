package com.lostark.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** 캐릭터를 찾을 수 없을 때 (404) */
    @ExceptionHandler(CharacterNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(CharacterNotFoundException e) {
        log.warn("Character not found: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(e.getMessage(), 404));
    }

    /** 로스트아크 API 호출 실패 (502) */
    @ExceptionHandler(LostarkApiException.class)
    public ResponseEntity<ErrorResponse> handleApiError(LostarkApiException e) {
        log.error("LostArk API error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new ErrorResponse(e.getMessage(), 502));
    }

    /** 로스트아크 API HTTP 오류 (4xx/5xx 응답) */
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<ErrorResponse> handleHttpClientError(HttpClientErrorException e) {
        int code = e.getStatusCode().value();
        log.warn("LostArk API HTTP error {}: {}", code, e.getMessage());

        if (code == 404) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("캐릭터를 찾을 수 없습니다.", 404));
        }
        if (code == 429) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.", 429));
        }
        if (code == 401 || code == 403) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new ErrorResponse("API 인증에 실패했습니다. API 키를 확인해 주세요.", 502));
        }
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new ErrorResponse("로스트아크 API 오류가 발생했습니다. (" + code + ")", 502));
    }

    /** 네트워크 타임아웃 / 접속 불가 */
    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<ErrorResponse> handleTimeout(ResourceAccessException e) {
        log.error("LostArk API unreachable: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
                .body(new ErrorResponse("로스트아크 서버에 접근할 수 없습니다. 잠시 후 다시 시도해 주세요.", 504));
    }

    /** 그 외 예상치 못한 서버 오류 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        log.error("Unexpected error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("서버 오류가 발생했습니다.", 500));
    }
}
