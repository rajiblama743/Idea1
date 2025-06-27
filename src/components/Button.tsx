import React from 'react';
import styled from 'styled-components/native';
import { TouchableOpacityProps } from 'react-native';
import { colors } from '@/constants/colors';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

const StyledButton = styled.TouchableOpacity<ButtonProps>`
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: ${props => {
    switch (props.size) {
      case 'small': return '8px 16px';
      case 'large': return '16px 32px';
      default: return '12px 24px';
    }
  }};
  background-color: ${props => {
    switch (props.variant) {
      case 'secondary': return colors.secondary;
      case 'outline': return colors.transparent;
      default: return colors.primary;
    }
  }};
  border: ${props => props.variant === 'outline' ? `1px solid ${colors.primary}` : 'none'};
  opacity: ${props => (props.disabled || props.loading) ? 0.6 : 1};
`;

const ButtonText = styled.Text<ButtonProps>`
  font-size: ${props => {
    switch (props.size) {
      case 'small': return '14px';
      case 'large': return '18px';
      default: return '16px';
    }
  }};
  font-weight: 600;
  color: ${props => {
    switch (props.variant) {
      case 'outline': return colors.primary;
      default: return colors.background;
    }
  }};
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      loading={loading}
      disabled={disabled || loading}
      {...props}
    >
      <ButtonText variant={variant} size={size}>
        {loading ? 'Loading...' : children}
      </ButtonText>
    </StyledButton>
  );
}; 