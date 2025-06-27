import React, { useState } from 'react';
import styled from 'styled-components/native';
import { TextInputProps, TouchableOpacity, Text } from 'react-native';
import { colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

const Container = styled.View`
  margin-bottom: 16px;
`;

const Label = styled.Text`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.text};
  margin-bottom: 8px;
`;

const InputContainer = styled.View<{ hasError: boolean }>`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${props => props.hasError ? colors.error : colors.border};
  border-radius: 8px;
  background-color: ${colors.background};
`;

const StyledInput = styled.TextInput`
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  color: ${colors.text};
`;

const PasswordToggle = styled.TouchableOpacity`
  padding: 12px 16px;
  justify-content: center;
  align-items: center;
  min-width: 44px;
`;

const ToggleText = styled.Text`
  font-size: 18px;
  color: ${colors.textSecondary};
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: ${colors.error};
  margin-top: 4px;
`;

export const Input: React.FC<InputProps> = ({
  label,
  error,
  showPasswordToggle = false,
  secureTextEntry,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const shouldShowToggle = showPasswordToggle && secureTextEntry;
  const isPasswordHidden = secureTextEntry && !isPasswordVisible;

  return (
    <Container>
      {label && <Label>{label}</Label>}
      <InputContainer hasError={!!error}>
        <StyledInput
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPasswordHidden}
          {...props}
        />
        {shouldShowToggle && (
          <PasswordToggle 
            onPress={togglePasswordVisibility}
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
            accessibilityRole="button"
          >
            <ToggleText>{isPasswordVisible ? '🙈' : '👁️'}</ToggleText>
          </PasswordToggle>
        )}
      </InputContainer>
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
}; 