import React from 'react';
    import { IMaskInput } from 'react-imask';
    import { Input } from '@/components/ui/input';
    import PropTypes from 'prop-types';
    
    const MaskedInput = React.forwardRef((props, ref) => {
      const { onChange, ...rest } = props;
      return (
        <IMaskInput
          {...rest}
          inputRef={ref}
          onAccept={(value) => onChange({ target: { name: props.name, value } })}
          unmask={true} 
        />
      );
    });
    
    MaskedInput.displayName = 'MaskedInput';
    
    MaskedInput.propTypes = {
      name: PropTypes.string,
      onChange: PropTypes.func.isRequired,
    };
    
    const InputWithMask = React.forwardRef(({ mask, ...props }, ref) => {
      return <Input as={MaskedInput} mask={mask} {...props} ref={ref} />;
    });
    
    InputWithMask.displayName = 'InputWithMask';
    
    InputWithMask.propTypes = {
        mask: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.instanceOf(RegExp),
            PropTypes.func,
            PropTypes.array,
        ]).isRequired,
    };
    
    export default InputWithMask;